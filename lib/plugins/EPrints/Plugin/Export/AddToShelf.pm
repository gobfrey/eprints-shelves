=pod
A plugin that will add the IDs of a search result to a shelf specified by the shelfid param.

Note that this is not advertised.  The link is created by the shelves javascript.

This was required due to chenges in the EPrints search infrastructure (Xapian searches don't have caches.
=cut


package EPrints::Plugin::Export::AddToShelf;

use EPrints::Plugin::Export;

@ISA = ( "EPrints::Plugin::Export" );

use strict;
use JSON;

sub new
{
	my( $class, %opts ) = @_;

	my $self = $class->SUPER::new( %opts );

	$self->{name} = "Add To Shelf";
	$self->{accept} = [ 'list/eprint' ];
	$self->{visible} = "all";
	$self->{mimetype} = "application/json";

	$self->{advertise} = 0;	

	$self->{GLOBAL_ERROR} = undef;
	
	return $self;
}


sub output_list
{
	my( $plugin, %opts ) = @_;

	my $repo = $plugin->repository;
	my $user = $repo->current_user;

	if (!$user)
	{
		return JSON::encode_json({ error =>  '<div class=\"epjs_shelves_error\">Search expired. Try starting another search.</div>'});
	}

	my $shelf_id = $repo->param('shelfid');
	my $shelf = $plugin->get_shelf($user, $shelf_id);
	if (!defined $shelf || defined $plugin->{GLOBAL_ERROR})
	{
		return unless defined $plugin->{GLOBAL_ERROR};
		return JSON::encode_json({ error => $plugin->{GLOBAL_ERROR}});
	}

	my $ids = $opts{list}->get_ids;

	$shelf->add_items( @{$ids} );

	return;
}

# instanciate shelf, check current user has the perms to write to it
sub get_shelf
{
	my ($self, $user, $shelfid) = @_;
	my $repo = $self->repository;

	return unless $shelfid;

	my $shelf = $repo->dataset( 'shelf' )->dataobj( $shelfid );
	unless( defined $shelf )
	{
		$self->{GLOBAL_ERROR} = '<div class=\"epjs_shelves_error\">Shelf #'.$shelfid.' does not exist.</div>';
		return undef;
	}

	unless( $shelf->has_editor( $user ) )
	{
		$self->{GLOBAL_ERROR} = '<div class=\"epjs_shelves_error\">You may not modify this Shelf.</div>';
		return undef;
	}

	return $shelf;
}

1;

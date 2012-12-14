package EPrints::Plugin::Screen::EPMC::Shelves;

@ISA = ( 'EPrints::Plugin::Screen::EPMC' );

use strict;
# Make the plug-in
sub new
{
      my( $class, %params ) = @_;

      my $self = $class->SUPER::new( %params );

      $self->{actions} = [qw( enable disable )];
      $self->{disable} = 0; # always enabled, even in lib/plugins

      $self->{package_name} = 'shelves';

      return $self;
}

=item $screen->action_enable( [ SKIP_RELOAD ] )

Enable the L<EPrints::DataObj::EPM> for the current repository.

If SKIP_RELOAD is true will not reload the repository configuration.

=cut

sub action_enable
{
        my( $self, $skip_reload ) = @_;

        $self->SUPER::action_enable( $skip_reload );

        my $repo = $self->{repository};

        my $citation = $repo->dataset( 'eprint' )->citation( 'result' );

        my $filename = $citation->{filename};

        my $string = '
<cite:citation xmlns="http://www.w3.org/1999/xhtml" xmlns:cite="http://eprints.org/ep3/citation" xmlns:epc="http://eprints.org/ep3/control" type="table_row">
  <tr class="ep_search_result">
    <td class="shelf_tools">
        <shelfitem eprintid="{eprintid}"></shelfitem>
    </td>
  </tr>
</cite:citation>
';
        EPrints::XML::add_to_xml( $filename,$string,$self->{package_name} );
        $self->reload_config if !$skip_reload;
}

=item $screen->action_disable( [ SKIP_RELOAD ] )

Disable the L<EPrints::DataObj::EPM> for the current repository.

If SKIP_RELOAD is true will not reload the repository configuration.

=cut

sub action_disable
{
        my( $self, $skip_reload ) = @_;

        $self->SUPER::action_disable( $skip_reload );
        my $repo = $self->{repository};

        my $citation = $repo->dataset( 'eprint' )->citation( 'result' );

        my $filename = $citation->{filename};
        EPrints::XML::remove_package_from_xml($filename,$self->{package_name} );

        $self->reload_config if !$skip_reload;

}

